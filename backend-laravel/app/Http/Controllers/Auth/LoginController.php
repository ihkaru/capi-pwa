<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log; // Import Log facade

class LoginController extends Controller
{
    public function login(Request $request)
    {
        Log::info('Login attempt for email: ' . $request->email); // Added log

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $token = $user->createToken('auth-token')->plainTextToken;

            Log::info('Login successful for user: ' . $user->email); // Added log
            return response()->json([
                'user' => $user,
                'token' => $token,
            ]);
        }

        Log::warning('Login failed for email: ' . $request->email . ' - Invalid credentials'); // Added log
        return response()->json(['message' => 'Invalid credentials'], 401);
    }
}