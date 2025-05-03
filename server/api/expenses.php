<?php
require_once 'config/database.php';

// Handle expense-related requests
switch ($method) {
    case 'GET':
        if ($id) {
            // Get a specific expense
            $response = supabase_request('/rest/v1/expenses?id=eq.' . urlencode($id) . '&select=*', 'GET');
            echo json_encode($response['data'][0] ?? null);
        } else {
            // Get all expenses
            $response = supabase_request('/rest/v1/expenses?select=*', 'GET');
            echo json_encode($response['data']);
        }
        break;
        
    case 'POST':
        // Create a new expense
        if (!isset($input['amount']) || !isset($input['description']) || !isset($input['category'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Amount, description and category are required']);
            exit;
        }
        
        $expense = [
            'amount' => $input['amount'],
            'description' => $input['description'],
            'category' => $input['category'],
            'date' => $input['date'] ?? date('Y-m-d'),
            'user_id' => $input['user_id'] ?? null, // In a real app, get from auth token
            'created_at' => date('c')
        ];
        
        $response = supabase_request('/rest/v1/expenses', 'POST', $expense);
        echo json_encode($response['data']);
        break;
        
    case 'PUT':
        // Update an expense
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Expense ID is required']);
            exit;
        }
        
        $response = supabase_request('/rest/v1/expenses?id=eq.' . urlencode($id), 'PATCH', $input);
        echo json_encode(['success' => true]);
        break;
        
    case 'DELETE':
        // Delete an expense
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Expense ID is required']);
            exit;
        }
        
        $response = supabase_request('/rest/v1/expenses?id=eq.' . urlencode($id), 'DELETE');
        echo json_encode(['success' => true]);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}