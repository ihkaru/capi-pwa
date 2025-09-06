<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\GoogleLoginController; // New import

Route::post('/login', [LoginController::class, 'login']);

// Google Login Routes
Route::get('/auth/google', [GoogleLoginController::class, 'redirectToGoogle']);
Route::post('/auth/google/callback', [GoogleLoginController::class, 'handleGoogleCallback']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
    Route::post('/logout', function (Request $request) {
        $request->user()->currentAccessToken()->delete();
        return response()->noContent();
    });

    Route::get('/activities', [App\Http\Controllers\ActivityController::class, 'index']);
    Route::get('/activities/{activityId}/initial-data', [App\Http\Controllers\ActivityController::class, 'getInitialData']);
    Route::get('/activities/{activityId}/updates', [App\Http\Controllers\ActivityController::class, 'getUpdates']); // RUTE BARU
    Route::post('/activities/{activityId}/assignments', [App\Http\Controllers\ActivityController::class, 'submitAssignments']); // RUTE BARU
    Route::post('/assignments/{assignmentId}/photos', [App\Http\Controllers\AssignmentPhotoController::class, 'upload']); // RUTE BARU
    Route::post('/assignments/{assignmentId}/status', [App\Http\Controllers\AssignmentStatusController::class, 'update']); // RUTE BARU
    Route::get('/assignments/{assignmentId}/allowed-actions', [App\Http\Controllers\ActivityController::class, 'getAllowedActions']); // RUTE BARU
});