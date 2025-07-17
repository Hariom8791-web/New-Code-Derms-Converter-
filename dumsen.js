const mqtt = require('mqtt');

// MQTT broker URL (local, no authentication)
const brokerUrl = 'mqtt://localhost:1883';

// Topic (decoded from base64: 'b25saW5lcmVzbW9uaXRvcg==' → 'onlineresmmonitor')
const topic = 'b25saW5lcmVzbW9uaXRvcg==';

// Unique client ID
const clientId = 'emqx_nodejs_' + Math.random().toString(16).substring(2, 8);

// Base message templates
// const baseMessages = [
//     ' {"data":"eyJpbml0aWFsU3RhcnQiOjF9"} ',
//     ' {"data":"eyJUZW1wIjozMS42MDAwMDAsIkh1bSI6NDQuMDk5OTk4LCJIZWF0X0luZGV4IjozMi40MzQ1MjgsInN0YXJ0IjoxfQ=="}',
//     ' {"data":"eyJSRVNfMCI6NzQxLCJhbGFybSI6MCwic3RhcnQiOjF9"} ',
//     ' {"data":"eyJSRVNfMSI6Nzg5LCJhbGFybSI6MCwic3RhcnQiOjF9"}',
//     ' {"data":"eyJSRVNfMiI6NDU2LCJhbGFybSI6MCwic3RhcnQiOjF9"} ',
//     ' {"data":"eyJSRVNfMyI6MTIzLCJhbGFybSI6MCwic3RhcnQiOjF9"} ',
//     ' {"data":"eyJlbmQiOjF9"} '
// ];
const baseMessages = [
    ' {"data":"eyJpbml0aWFsU3RhcnQiOjF9"} ',

    ' {"data":"eyJSRVNfMyI6MTIzLCJhbGFybSI6MCwic3RhcnQiOjF9"} ',
    ' {"data":"eyJORVJfMCI6ODg4LCJhbGFybSI6MCwic3RhcnQiOjF9"} ',
    ' {"data":"eyJlbmQiOjF9"} '
];

// Node ID range
const startNodeId = 1001;
const endNodeId = 1002;

// Connect to the MQTT broker (no username/password)
const client = mqtt.connect(brokerUrl, {
    clientId
});

client.on('connect', () => {
    console.log('Connected to MQTT broker');

    // Start publishing messages in a continuous loop
    setInterval(() => {
        console.log('Restarting message publishing loop...');
        publishMessagesForNodes(startNodeId);
    }, 15000); // Every 15 seconds
});

// Function to publish messages for all Node IDs sequentially
function publishMessagesForNodes(currentNodeId) {
    if (currentNodeId > endNodeId) {
        console.log('Finished one round of Node IDs.');
        return;
    }

    console.log(`Starting to publish messages for Node ID: ${currentNodeId}`);
    let index = 0;

    const intervalId = setInterval(() => {
        if (index < baseMessages.length) {
            // Add Node_Id to message
            const message = JSON.stringify({
                Node_Id: currentNodeId,
                ...JSON.parse(baseMessages[index])
            });

            client.publish(topic, message, (err) => {
                if (err) {
                    console.error(`Failed to publish for Node ${currentNodeId}, Msg ${index + 1}: ${err.message}`);
                } else {
                    console.log(`Published Node ${currentNodeId}, Msg ${index + 1}: ${message}`);
                }
            });

            index++;
        } else {
            clearInterval(intervalId);
            publishMessagesForNodes(currentNodeId + 1);
        }
    }, 1000); // 1-second delay
}

client.on('error', (err) => {
    console.error(`MQTT error: ${err.message}`);
});
