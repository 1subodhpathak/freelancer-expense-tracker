<?php
// Simple test endpoint to verify API connectivity
header('Content-Type: application/json');

$response = [
    'status' => 'success',
    'message' => 'API is working!',
    'timestamp' => time()
];

echo json_encode($response);