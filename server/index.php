<?php
// Enable CORS for development
header("Access-Control-Allow-Origin: *");  // For development only - make more restrictive in production
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Parse URL to determine the requested endpoint
$request_uri = $_SERVER['REQUEST_URI'];
$uri_parts = explode('/', trim($request_uri, '/'));

// Remove 'api' from the beginning if present
if ($uri_parts[0] === 'api') {
    array_shift($uri_parts);
}

// Define the resource and action
$resource = $uri_parts[0] ?? '';
$id = $uri_parts[1] ?? null;
$action = $uri_parts[2] ?? null;

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get request body for POST, PUT requests
$input = json_decode(file_get_contents('php://input'), true);

// Simple router
switch ($resource) {
    case 'test':
        require_once 'api/test.php';
        break;
        
    case 'expenses':
        require_once 'api/expenses.php';
        break;
        
    case 'income':
        require_once 'api/income.php';
        break;
        
    case 'auth':
        require_once 'api/auth.php';
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Resource not found']);
        break;
}