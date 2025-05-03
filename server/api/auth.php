<?php
require_once 'config/database.php';

// Handle authentication requests
switch ($method) {
    case 'POST':
        // Handle login or register
        if ($action === 'login') {
            // Login logic
            if (!isset($input['email']) || !isset($input['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email and password required']);
                exit;
            }
            
            // In a real app, you'd validate credentials through Supabase
            // This is a simplified example
            $response = supabase_request('/auth/v1/token?grant_type=password', 'POST', [
                'email' => $input['email'],
                'password' => $input['password'],
            ]);
            
            echo json_encode($response['data']);
            
        } elseif ($action === 'register') {
            // Register logic
            if (!isset($input['email']) || !isset($input['password']) || !isset($input['name'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email, password and name required']);
                exit;
            }
            
            // Create user in Supabase
            $response = supabase_request('/auth/v1/signup', 'POST', [
                'email' => $input['email'],
                'password' => $input['password'],
            ]);
            
            if ($response['status'] === 200) {
                // Add user metadata to a custom table
                $user_id = $response['data']['user']['id'];
                supabase_request('/rest/v1/users', 'POST', [
                    'id' => $user_id,
                    'name' => $input['name'],
                    'created_at' => date('c')
                ]);
            }
            
            echo json_encode($response['data']);
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}