const mqtt = require('mqtt');

// MQTT broker URL
const brokerUrl = 'mqtt://127.0.0.1:1883'; 
// Topic to subscribe to
const topic = 'b25saW5lcmVzbW9uaXRvcg==';

// Create an MQTT client
const client = mqtt.connect(brokerUrl);

// Event handler for when the client connects to the broker
client.on('connect', () => {
    console.log('Connected to MQTT broker');

    // Subscribe to the topic
    client.subscribe(topic, (err) => {
        if (!err) {
            console.log(`Subscribed to topic: ${topic}`);
        } else {
            console.error('Failed to subscribe to topic:', err);
        }
    });
});

// Event handler for when a message is received on the subscribed topic
client.on('message', (receivedTopic, message) => {
    if (receivedTopic === topic) {
        try {
            const payload = JSON.parse(message.toString()); // Parse JSON
            const nodeId = payload.Node_Id;
            const encodedData = payload.data;

            // Decode the Base64 data
            const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');

            console.log(`Received message on topic ${receivedTopic}:`);
            console.log(`Node ID: ${nodeId}`);
            console.log(`Decoded Data: ${decodedData}`);

        } catch (error) {
            console.error('Error parsing message:', error);
        }
    }
});

// Event handler for errors
client.on('error', (err) => {
    console.error('MQTT error:', err);
});

// Event handler for when the client disconnects
client.on('close', () => {
    console.log('Disconnected from MQTT broker');
});
