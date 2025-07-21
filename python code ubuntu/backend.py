import threading
import time
import json
import struct
import os
import random
import base64
from datetime import datetime
from pymodbus.client import ModbusTcpClient
import paho.mqtt.client as mqtt

CONFIG_FILE = "nodes_config.json"

# MQTT Configuration (can be moved to config file if needed)
MQTT_BROKER = 'localhost'
MQTT_PORT = 1883
MQTT_TOPIC = 'b25saW5lcmVzbW9uaXRvcg=='  # base64('onlineresmonitor')
PUBLISH_INTERVAL = 5  # Seconds between MQTT publish cycles

# Global state
nodes_config = {}       # NODE_ID -> {'ip', 'port', 'site', 'sensors': [...]}
node_threads = {}       # NODE_ID -> {'modbus_thread', 'mqtt_thread', 'running'}
node_logs = {}          # NODE_ID -> [log strings]
node_values = {}        # NODE_ID -> {sensor_name: value}
node_status = {}        # NODE_ID -> {sensor_name: status}
lock = threading.Lock()

def log(msg, node_id=None, level="INFO"):
    """Enhanced logging function with timestamp and node context"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    node_context = f"[NODE {node_id}] " if node_id else ""
    log_line = f"[{timestamp}] [{level}] {node_context}{msg}"
    print(log_line)
    
    if node_id:
        if node_id not in node_logs:
            node_logs[node_id] = []
        node_logs[node_id].append(log_line)
        node_logs[node_id] = node_logs[node_id][-300:]  # Keep last 300 logs

def save_config():
    """Save configuration to file"""
    with open(CONFIG_FILE, "w") as f:
        json.dump(nodes_config, f, indent=2)

def load_config():
    """Load configuration from file"""
    global nodes_config
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            nodes_config = json.load(f)
    else:
        nodes_config = {}

def decode_ner_float(high_reg, low_reg):
    """Decode NER float value from two registers (CDAB format)"""
    byte_data = bytes([
        (low_reg >> 8) & 0xFF,
        low_reg & 0xFF,
        (high_reg >> 8) & 0xFF,
        high_reg & 0xFF
    ])
    return struct.unpack('>f', byte_data)[0]

def read_sensor(client, sensor, node_id):
    """Read sensor value with robust error handling"""
    try:
        if sensor['type'] == 'RES':
            response = client.read_holding_registers(
                address=sensor['address'],
                count=sensor['count'],
                slave=sensor['slave_id']
            )
            if not response.isError():
                return response.registers[0]
            else:
                log(f"Modbus error reading {sensor['name']}", node_id, "WARNING")
        
        elif sensor['type'] == 'NER':
            response = client.read_holding_registers(
                address=sensor['start_address'],
                count=sensor['register_count'],
                slave=sensor['slave_id']
            )
            if not response.isError() and len(response.registers) >= (sensor.get('ner_position', 2) + 2):
                return decode_ner_float(
                    response.registers[sensor.get('ner_position', 2)],
                    response.registers[sensor.get('ner_position', 2) + 1]
                )
            else:
                log(f"Modbus error reading {sensor['name']}", node_id, "WARNING")
        
        return None
        
    except Exception as e:
        log(f"Read error for {sensor['name']}: {str(e)}", node_id, "ERROR")
        return None

def on_mqtt_connect(client, userdata, flags, rc, properties=None):
    """MQTT connection callback"""
    if rc == 0:
        log("MQTT connection established")
    else:
        log(f"MQTT connection failed with code {rc}", "ERROR")

def mqtt_publisher(node_id, node_config):
    """Publish sensor values to MQTT broker"""
    client_id = f"modbus_gateway_{node_id}_{random.randint(1000, 9999)}"
    client = mqtt.Client(client_id=client_id)
    client.on_connect = on_mqtt_connect
    
    try:
        client.connect(MQTT_BROKER, MQTT_PORT)
        client.loop_start()
        
        while node_threads[node_id]['running']:
            try:
                with lock:
                    # Prepare MQTT messages
                    msgs = [{'initialStart': 1}]
                    
                    for sensor in node_config['sensors']:
                        msgs.append({
                            sensor['name']: node_values[node_id].get(sensor['name'], 0),
                            'alarm': 0,
                            'start': 1
                        })
                        log(f"Publishing {sensor['name']} = {node_values[node_id].get(sensor['name'], 0)}", node_id)
                    
                    msgs.append({'end': 1})
                
                # Publish all messages
                for msg in msgs:
                    try:
                        encoded = base64.b64encode(json.dumps(msg).encode()).decode()
                        payload = json.dumps({"Node_Id": node_id, "data": encoded})
                        client.publish(MQTT_TOPIC, payload)
                        time.sleep(0.1)  # Small delay between messages
                    except Exception as e:
                        log(f"Publish error: {str(e)}", node_id, "ERROR")
                
                log("Publish cycle complete", node_id)
                time.sleep(PUBLISH_INTERVAL)
                
            except Exception as e:
                log(f"Publisher error: {str(e)}", node_id, "ERROR")
                time.sleep(5)
                
    finally:
        client.loop_stop()
        client.disconnect()

def start_node_worker(node_id, cfg):
    """Start Modbus and MQTT workers for a node"""
    node_threads[node_id] = {'running': True}
    ip, port = cfg['ip'], cfg['port']
    sensors = cfg['sensors']
    
    # Initialize node state
    with lock:
        node_values[node_id] = {s['name']: 0.0 for s in sensors}
        node_status[node_id] = {s['name']: 'INIT' for s in sensors}
    
    # Timing configuration
    INTER_SENSOR_DELAY = 0.5
    MODBUS_TIMEOUT = 3.0
    POLL_INTERVAL = 2
    RECONNECT_DELAY = 4

    def modbus_loop():
        """Modbus polling loop"""
        while node_threads[node_id]['running']:
            try:
                with ModbusTcpClient(
                    host=ip,
                    port=int(port),
                    timeout=MODBUS_TIMEOUT,
                    retries=1,
                ) as client:
                    
                    log(f"Attempting to connect to {ip}:{port}", node_id)
                    connection_start = time.time()
                    
                    if not client.connect():
                        log(f"Connection failed after {time.time()-connection_start:.1f}s", node_id, "WARNING")
                        time.sleep(RECONNECT_DELAY)
                        continue
                    
                    log(f"Connected in {time.time()-connection_start:.1f}s", node_id)
                    
                    while node_threads[node_id]['running']:
                        cycle_start = time.time()
                        all_success = True
                        
                        for sensor in sensors:
                            if not node_threads[node_id]['running']:
                                break
                                
                            sensor_start = time.time()
                            
                            if not client.is_socket_open():
                                log("Connection lost, reconnecting...", node_id, "WARNING")
                                break
                            
                            value = read_sensor(client, sensor, node_id)
                            
                            with lock:
                                if value is not None:
                                    node_values[node_id][sensor['name']] = value
                                    node_status[node_id][sensor['name']] = 'OK'
                                    log_msg = f"{sensor['name']} = {value:.4f}" if sensor['type'] == 'NER' else f"{sensor['name']} = {value}"
                                    log(log_msg, node_id)
                                else:
                                    node_status[node_id][sensor['name']] = 'ERROR'
                                    all_success = False
                            
                            elapsed = time.time() - sensor_start
                            remaining_delay = max(0, INTER_SENSOR_DELAY - elapsed)
                            time.sleep(remaining_delay)
                        
                        if not client.is_socket_open():
                            break
                        
                        if all_success:
                            log(f"Poll cycle completed successfully", node_id)
                        else:
                            log(f"Poll cycle completed with some errors", node_id, "WARNING")
                        
                        if node_threads[node_id]['running']:
                            elapsed = time.time() - cycle_start
                            remaining_delay = max(0, POLL_INTERVAL - elapsed)
                            time.sleep(remaining_delay)
            
            except Exception as e:
                log(f"Modbus system error: {str(e)}", node_id, "ERROR")
                time.sleep(RECONNECT_DELAY)

    # Start worker threads
    modbus_thread = threading.Thread(target=modbus_loop, daemon=True)
    mqtt_thread = threading.Thread(target=mqtt_publisher, args=(node_id, cfg), daemon=True)
    
    modbus_thread.start()
    mqtt_thread.start()
    
    node_threads[node_id]['modbus_thread'] = modbus_thread
    node_threads[node_id]['mqtt_thread'] = mqtt_thread
    log(f"Started worker threads for node {node_id}")

def launch_node(node_id, cfg):
    """Start a node if not already running"""
    if node_id in node_threads:
        return
        
    try:
        start_node_worker(node_id, cfg)
        log(f"Launched node {node_id}")
    except Exception as e:
        log(f"Error starting node {node_id}: {str(e)}", level="ERROR")

def get_node_status(node_id):
    """Get status of a node"""
    if node_id in node_threads and node_threads[node_id]['running']:
        return "RUNNING"
    return "STOPPED"

def get_all_nodes():
    """Get all configured nodes"""
    return nodes_config

def delete_node(node_id):
    """Delete a node and clean up resources"""
    if node_id in node_threads:
        node_threads[node_id]['running'] = False
        if 'modbus_thread' in node_threads[node_id]:
            node_threads[node_id]['modbus_thread'].join(timeout=1)
        if 'mqtt_thread' in node_threads[node_id]:
            node_threads[node_id]['mqtt_thread'].join(timeout=1)
        del node_threads[node_id]
    
    if node_id in nodes_config:
        del nodes_config[node_id]
        save_config()
    
    for data in [node_logs, node_values, node_status]:
        if node_id in data:
            del data[node_id]
    
    log(f"Deleted node {node_id}")

def cleanup():
    """Clean up all threads on exit"""
    for node_id in list(node_threads.keys()):
        node_threads[node_id]['running'] = False
        if 'modbus_thread' in node_threads[node_id]:
            node_threads[node_id]['modbus_thread'].join(timeout=1)
        if 'mqtt_thread' in node_threads[node_id]:
            node_threads[node_id]['mqtt_thread'].join(timeout=1)

