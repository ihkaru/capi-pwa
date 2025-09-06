<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AssignmentResponse;
use Illuminate\Support\Facades\Auth;

class AssignmentStatusController extends Controller
{
    public function update(Request $request, $assignmentId)
    {
        $request->validate([
            'status' => 'required|string|in:Approved by PML,Rejected by PML,Submitted by PPL',
            'notes' => 'nullable|string',
        ]);

        $response = AssignmentResponse::with('assignment.kegiatanStatistik')->where('assignment_id', $assignmentId)->firstOrFail();

        // Authorization: Only PML of the same activity can update
        $user = Auth::user();
        $activity = $response->assignment->kegiatanStatistik;
        
        $isPML = $user->hasRole('PML') && $user->kegiatanStatistiks()->where('kegiatan_statistik_id', $activity->id)->exists();

        if (!$isPML) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $currentStatus = $response->status;
        $requestedStatus = $request->status;

        // Allow transition from Approved by PML to Submitted by PPL
        if ($currentStatus === 'Approved by PML' && $requestedStatus === 'Submitted by PPL') {
            // This transition is allowed for PML to "unapprove"
            // No additional checks needed here, as PML authorization is already done.
        } elseif (!in_array($requestedStatus, ['Approved by PML', 'Rejected by PML'])) {
            // If it's not a valid PML action (approve/reject) and not the unapprove action, then it's forbidden.
            return response()->json(['message' => 'Invalid status transition.'], 403);
        }

        $response->status = $requestedStatus;
        if ($request->has('notes')) {
            $response->notes = $request->notes;
        }
        $response->reviewed_by_pml_at = now();
        $response->save();

        return response()->json(['message' => 'Status updated successfully']);
    }
}
