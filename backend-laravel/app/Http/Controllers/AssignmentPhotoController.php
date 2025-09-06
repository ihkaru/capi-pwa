<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Assignment;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
}
