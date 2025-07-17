import serial
import struct
import time
from pymodbus.client.serial import ModbusSerialClient

# === USER CONFIGURATION ===
PORT = 'COM10'
BAUDRATE = 9600
NEW_SLAVE_ID = 2     # Desired new slave ID (decimal)
VERIFY_REGISTER = 0x0002 # Register to read for slave ID verification
DELAY_AFTER_WRITE = 3    # Seconds to wait before verifying

# === CRC16 MODBUS (little-endian) ===
def calculate_crc(data: bytes) -> bytes:
    crc = 0xFFFF
    for byte in data:
        crc ^= byte
        for _ in range(8):
            if (crc & 0x0001):
                crc >>= 1
                crc ^= 0xA001
            else:
                crc >>= 1
    return struct.pack('<H', crc)  # Return as little-endian (low byte first)

# === Build raw Modbus RTU frame ===
def build_modbus_frame(new_id: int) -> bytes:
    frame = bytearray()
    frame.append(0x00)              # Broadcast address
    frame.append(0x06)              # Function code: Write Single Register
    frame += b'\x00\x02'            # Address 0x0002 (ID register)
    frame += struct.pack('>H', new_id)  # New ID as big-endian
    crc = calculate_crc(frame)
    frame += crc
    return frame

# === Step 1: Send raw Modbus RTU broadcast frame ===
raw_frame = build_modbus_frame(NEW_SLAVE_ID)
print("🔧 Sending raw frame:", ' '.join(f'{b:02X}' for b in raw_frame))

try:
    with serial.Serial(PORT, BAUDRATE, bytesize=8, parity='N', stopbits=1, timeout=2) as ser:
        ser.write(raw_frame)
        print("✅ Frame sent successfully.")
except Exception as e:
    print(f"❌ Error sending frame: {e}")
    exit()

# === Step 2: Wait for sensor to apply change ===
print(f"⏳ Waiting {DELAY_AFTER_WRITE} seconds for sensor to apply change...")
time.sleep(DELAY_AFTER_WRITE)

# === Step 3: Verify using pymodbus ===
print(f"🔍 Verifying slave ID by reading register 0x0002 from device ID {NEW_SLAVE_ID}...")

client = ModbusSerialClient(
    port=PORT,
    baudrate=BAUDRATE,
    stopbits=1,
    bytesize=8,
    parity='N',
    timeout=2
)

if not client.connect():
    print("❌ Could not connect for verification.")
    exit()

try:
    result = client.read_holding_registers(
        address=VERIFY_REGISTER,
        count=1,
        slave=NEW_SLAVE_ID
    )

    if result.isError():
        print("❌ Verification failed: No response from new slave ID.")
    else:
        read_value = result.registers[0]
        if read_value == NEW_SLAVE_ID:
            print(f"✅ Verification successful: Slave ID correctly set to {read_value}.")
        else:
            print(f"⚠️ Mismatch: Read value = {read_value}, expected = {NEW_SLAVE_ID}")
finally:
    client.close()
