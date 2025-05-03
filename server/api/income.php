<?php
require_once 'config/database.php';

// Handle income-related requests
switch ($method) {
    case 'GET':
        if ($id) {
            // Get a specific income entry
            $response = supabase_request('/rest/v1/income?id=eq.' . urlencode($id) . '&select=*', 'GET');
            echo json_encode($response['data'][0] ?? null);
        } else {
            // Get all income entries
            $response = supabase_request('/rest/v1/income?select=*', 'GET');
            echo json_encode($response['data']);
        }
        break;
        
    case 'POST':
        // Create a new income entry
        if (!isset($input['amount']) || !isset($input['description']) || !isset($input['source'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Amount, description and source are required']);
            exit;
        }
        
        $income = [
            'amount' => $input['amount'],
            'description' => $input['description'],
            'source' => $input['source'],
            'date' => $input['date'] ?? date('Y-m-d'),
            'user_id' => $input['user_id'] ?? null, // In a real app, get from auth token
            'created_at' => date('c')
        ];
        
        $response = supabase_request('/rest/v1/income', 'POST', $income);
        echo json_encode($response['data']);
        break;
        
    case 'PUT':
        // Update an income entry
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Income ID is required']);
            exit;
        }
        
        $response = supabase_request('/rest/v1/income?id=eq.' . urlencode($id), 'PATCH', $input);
        echo json_encode(['success' => true]);
        break;
        
    case 'DELETE':
        // Delete an income entry
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Income ID is required']);
            exit;
        }
        
        $response = supabase_request('/rest/v1/income?id=eq.' . urlencode($id), 'DELETE');
        echo json_encode(['success' => true]);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}