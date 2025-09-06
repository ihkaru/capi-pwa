<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Assignment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\AssignmentAttachment; // Import AssignmentAttachment
use Illuminate\Support\Facades\Log; // Import Log facade

class AssignmentPhotoController extends Controller
{
    public function upload(Request $request, $assignmentId)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $assignment = Assignment::findOrFail($assignmentId);
        $user = $request->user();

        // Authorization: Only the assigned PPL can upload a photo
        if ($assignment->ppl_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $file = $request->file('photo');
        $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();
        
        // Store in 'public/photos' which is linked to 'storage/app/public/photos'
        $path = $file->storeAs('photos', $fileName, 'public');

        $url = Storage::disk('public')->url($path);

        return response()->json([
            'success' => true,
            'message' => 'Photo uploaded successfully',
            'fileId' => $path, // e.g., 'photos/uuid.jpg'
            'url' => $url
        ]);
    }

    public function uploadActivityPhoto(Request $request, $activityId, $interviewId)
    {
        Log::info('uploadActivityPhoto: Received request for activity ' . $activityId . ' and interview ' . $interviewId);
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        $user = $request->user();

        // Authorization: Ensure the user is a PPL
        if (!$user->hasRole('PPL')) {
            Log::warning('uploadActivityPhoto: Unauthorized attempt by user ' . $user->id . ' (not PPL).');
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $file = $request->file('photo');
        $fileName = Str::uuid() . '.' . $file->getClientOriginalExtension();

        // Store in 'public/photos'
        $path = $file->storeAs('photos', $fileName, 'public');
        Log::info('uploadActivityPhoto: Photo stored at ' . $path);

        // Create AssignmentAttachment record with null assignment_id
        $attachment = AssignmentAttachment::create([
            'assignment_id' => null, // Will be linked later when assignment is created
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $path,
            'mime_type' => $file->getMimeType(),
            'file_size_bytes' => $file->getSize(),
        ]);
        Log::info('uploadActivityPhoto: AssignmentAttachment created with ID ' . $attachment->id);

        return response()->json([
            'success' => true,
            'message' => 'Photo uploaded successfully',
            'photo_id' => $attachment->id, // Return the ID of the attachment
            'url' => Storage::disk('public')->url($path),
        ]);
    }
}
