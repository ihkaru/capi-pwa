<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log; // Import Log facade

class GoogleLoginController extends Controller
{
    /**
     * Redirect the user to the Google authentication page.
     *
     * @return \Symfony\Component\HttpFoundation\RedirectResponse
     */
    public function redirectToGoogle()
    {
        Log::info('Redirecting to Google for authentication.'); // Added log
        return Socialite::driver('google')->stateless()->redirect();
    }

    /**
     * Handle the callback from Google authentication.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handleGoogleCallback(Request $request)
    {
        Log::info('Google callback received.'); // Added log
        try {
            $idToken = $request->input('token');
            if (!$idToken) {
                Log::warning('Google callback: ID token not provided.'); // Added log
                return response()->json(['error' => 'ID token not provided.'], 400);
            }
            $googleUser = Socialite::driver('google')->userFromToken($idToken);
            Log::info('Google user obtained: ' . $googleUser->email); // Added log
        } catch (\Exception $e) {
            Log::error('Google callback: Failed to authenticate with Google. Error: ' . $e->getMessage()); // Added log
            return response()->json(['error' => 'Failed to authenticate with Google.', 'message' => $e->getMessage()], 400);
        }

        $user = User::where('google_id', $googleUser->id)->first();

        if (!$user) {
            Log::info('Google callback: User not found by google_id. Checking by email.'); // Added log
            $user = User::where('email', $googleUser->email)->first();

            if ($user) {
                Log::info('Google callback: User found by email, linking Google ID.'); // Added log
                $user->google_id = $googleUser->id;
                $user->google_avatar = $googleUser->avatar;
                if (empty($user->password)) {
                    $user->password = null;
                }
                $user->save();
            } else {
                Log::info('Google callback: New user, creating floating user.'); // Added log
                $user = User::create([
                    'name' => $googleUser->name,
                    'email' => $googleUser->email,
                    'password' => null,
                    'google_id' => $googleUser->id,
                    'google_avatar' => $googleUser->avatar,
                    'satker_id' => null,
                ]);
            }
        } else {
            Log::info('Google callback: User found by google_id, logging in.'); // Added log
            if ($user->google_avatar !== $googleUser->avatar) {
                $user->google_avatar = $googleUser->avatar;
                $user->save();
                Log::info('Google callback: User avatar updated.'); // Added log
            }
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        Log::info('Google login successful for user: ' . $user->email); // Added log

        return response()->json([
            'data' => [
                'access_token' => $token,
                'token_type' => 'Bearer',
                'user' => $user,
            ]
        ]);
    }
}
