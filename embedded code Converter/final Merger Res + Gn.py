import time
from datetime import datetime
import json
import base64
import paho.mqtt.client as mqtt
from pymodbus.client import ModbusTcpClient
from threading import Thread, Lock
import random
import struct

# ======================== CONFIGURATION ======================== #
# --- Modbus Server Configuration ---
MODBUS_SERVER_IP = '192.168.0.7'
MODBUS_PORT = 502

# --- Timing Configuration for 9600 baud ---
# At 9600 baud: ~1ms per byte (including start/stop bits)
# Typical Modbus RTU frame: ~10-20 bytes = 10-20ms per transaction
# Conservative settings with margin:
INTER_SENSOR_DELAY = 0.1  # 100ms between sensors (allows for processing time)
MODBUS_TIMEOUT = 1.0      # 1 second timeout (conservative for 9600 baud)
POLL_INTERVAL = 5         # 5 seconds between full poll cycles (matches publish interval)

# --- MQTT Configuration ---
MQTT_BROKER = 'localhost'
MQTT_PORT = 1883
MQTT_TOPIC = 'b25saW5lcmVzbW9uaXRvcg=='  # base64('onlineresmonitor')
NODE_ID = 1004
PUBLISH_INTERVAL = 5  # Seconds between MQTT publish cycles

# ======================== SENSOR DEFINITIONS ======================== #
SENSORS = [
    # Resistance Sensors (RES)
    {
        'type': 'RES',
        'name': 'RES_0',
        'slave_id': 1,
        'address': 0x0001,
        'count': 1
    },
    {
        'type': 'RES',
        'name': 'RES_1',
        'slave_id': 7,
        'address': 0x0001,
        'count': 1
    },
        {
        'type': 'RES',
        'name': 'RES_2',
        'slave_id': 2,
        'address': 0x0001,
        'count': 1
    },
    # NER Sensors
    {
        'type': 'NER',
        'name': 'NER_0',
        'slave_id': 3,
        'start_address': 0,
        'register_count': 20,
        'ner_position': 2
    }
]

# ======================== GLOBAL STATE ======================== #
sensor_values = {sensor['name']: 0.0 for sensor in SENSORS}
sensor_status = {sensor['name']: 'INIT' for sensor in SENSORS}
last_read_time = {sensor['name']: 0 for sensor in SENSORS}
last_publish_time = 0
lock = Lock()

# Generate unique client ID
CLIENT_ID = f'flex_gateway_{random.randint(1000, 9999)}'

# ======================== LOGGING ======================== #
def log(msg: str, level: str = "INFO", sensor_name: str = None):
    """Enhanced logging with sensor-specific context"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    sensor_context = f"[{sensor_name}] " if sensor_name else ""
    print(f"[{timestamp}] [{level}] {sensor_context}{msg}")

# ======================== MODBUS FUNCTIONS ======================== #
def decode_ner_float(high_reg, low_reg):
    """Decodes CDAB format float from two registers"""
    byte_data = bytes([
        (low_reg >> 8) & 0xFF,
        low_reg & 0xFF,
        (high_reg >> 8) & 0xFF,
        high_reg & 0xFF
    ])
    return struct.unpack('>f', byte_data)[0]

def read_sensor(client, sensor):
    """Reads a sensor value with proper timing"""
    try:
        if sensor['type'] == 'RES':
            response = client.read_holding_registers(
                address=sensor['address'],
                count=sensor['count'],
                slave=sensor['slave_id']
            )
            if not response.isError():
                return response.registers[0]
        
        elif sensor['type'] == 'NER':
            response = client.read_holding_registers(
                address=sensor['start_address'],
                count=sensor['register_count'],
                slave=sensor['slave_id']
            )
            if not response.isError() and len(response.registers) >= (sensor['ner_position'] + 2):
                return decode_ner_float(
                    response.registers[sensor['ner_position']],
                    response.registers[sensor['ner_position'] + 1]
                )
        
        log(f"Modbus read failed", "WARNING", sensor['name'])
        return None
        
    except Exception as e:
        log(f"Read error: {str(e)}", "ERROR", sensor['name'])
        return None

def modbus_reader():
    """Sequential sensor reader with proper timing for 9600 baud"""
    while True:
        try:
            with ModbusTcpClient(MODBUS_SERVER_IP, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT) as client:
                if not client.connect():
                    log("Modbus connection failed", "ERROR")
                    time.sleep(5)
                    continue
                
                log("Modbus connected, starting poll loop")
                
                while True:
                    for sensor in SENSORS:
                        start_time = time.time()
                        value = read_sensor(client, sensor)
                        
                        with lock:
                            if value is not None:
                                sensor_values[sensor['name']] = value
                                sensor_status[sensor['name']] = 'OK'
                                last_read_time[sensor['name']] = start_time
                                if sensor['type'] == 'NER':
                                    log(f"Value = {value:.4f}", "INFO", sensor['name'])
                                else:
                                    log(f"Value = {value}", "INFO", sensor['name'])
                            else:
                                sensor_status[sensor['name']] = 'ERROR'
                                log(f"Using last known value", "WARNING", sensor['name'])
                        
                        # Respect timing for 9600 baud
                        elapsed = time.time() - start_time
                        remaining_delay = max(0, INTER_SENSOR_DELAY - elapsed)
                        time.sleep(remaining_delay)
                    
                    # Full cycle complete
                    log(f"Poll cycle complete, sleeping {POLL_INTERVAL}s")
                    time.sleep(POLL_INTERVAL)
                    
        except Exception as e:
            log(f"Modbus system error: {str(e)}", "ERROR")
            time.sleep(5)

# ======================== MQTT FUNCTIONS ======================== #
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        log("MQTT connection established")
    else:
        log(f"MQTT connection failed with code {rc}", "ERROR")

def mqtt_publisher():
    """Publishes stored values every 5 seconds regardless of freshness"""
    client = mqtt.Client(
        client_id=CLIENT_ID,
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2
    )
    client.on_connect = on_connect
    client.connect(MQTT_BROKER, MQTT_PORT)
    client.loop_start()

    while True:
        try:
            # Create MQTT messages with current values (regardless of freshness)
            msgs = [{'initialStart': 1}]
            
            with lock:
                for sensor in SENSORS:
                    msgs.append({
                        sensor['name']: sensor_values[sensor['name']],
                        'alarm': 0,
                        'start': 1
                    })
                    # Log current value being published
                    if sensor['type'] == 'NER':
                        log(f"Publishing value = {sensor_values[sensor['name']]:.4f}", "INFO", sensor['name'])
                    else:
                        log(f"Publishing value = {sensor_values[sensor['name']]}", "INFO", sensor['name'])
            
            msgs.append({'end': 1})
            
            # Publish all messages
            for msg in msgs:
                try:
                    encoded = base64.b64encode(json.dumps(msg).encode()).decode()
                    payload = json.dumps({"Node_Id": NODE_ID, "data": encoded})
                    client.publish(MQTT_TOPIC, payload)
                    time.sleep(0.1)  # Small delay between messages
                except Exception as e:
                    log(f"Publish error: {str(e)}", "ERROR")
            
            log("Publish cycle complete", "INFO")
            time.sleep(PUBLISH_INTERVAL)
            
        except Exception as e:
            log(f"Publisher error: {str(e)}", "ERROR")
            time.sleep(5)

# ======================== MAIN ======================== #
if __name__ == '__main__':
    # Initialize with current time
    init_time = time.time()
    for sensor in SENSORS:
        last_read_time[sensor['name']] = init_time
    
    log(f"Starting Flexible Gateway (Node {NODE_ID})")
    log(f"Configured with {len(SENSORS)} sensors at 9600 baud:")
    for i, sensor in enumerate(SENSORS):
        log(f"{i+1}. {sensor['name']} ({sensor['type']}) - Slave {sensor['slave_id']}")
    
    # Start threads
    Thread(target=modbus_reader, daemon=True).start()
    Thread(target=mqtt_publisher, daemon=True).start()
    
    # Main loop
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log("Shutting down...")
