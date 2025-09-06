<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Resources\KegiatanStatistikResource;
use Carbon\Carbon;
use App\Models\KegiatanStatistik; // Import KegiatanStatistik
use App\Models\Assignment; // Import Assignment
use App\Models\MasterData; // Import MasterData
use App\Models\AssignmentResponse;
use App\Models\AssignmentAttachment; // Import AssignmentAttachment
use Illuminate\Support\Facades\Log; // Import Log facade
use Illuminate\Support\Facades\DB; // Import DB facade
use Illuminate\Support\Facades\Validator;

class ActivityController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        Log::info('ActivityController@index: User attempting to fetch activities. User ID: ' . $user->id . ', Email: ' . $user->email);
        Log::info('ActivityController@index: User roles: ' . implode(', ', $user->getRoleNames()->toArray()));

        $activities = $user->kegiatanStatistiks()->get();

        Log::info('ActivityController@index: Raw activities found for user: ' . $activities->count());

        $filteredActivities = $activities->filter(function ($activity) use ($user) {
            $hasRole = $user->hasAnyRole(['PPL', 'PML']);
            Log::info('ActivityController@index: Checking activity ' . $activity->id . ' for user ' . $user->id . '. Has PPL/PML role: ' . ($hasRole ? 'true' : 'false'));
            return $hasRole;
        });

        Log::info('ActivityController@index: Filtered activities count: ' . $filteredActivities->count());

        return KegiatanStatistikResource::collection($filteredActivities);
    }

    public function getInitialData(Request $request, $activityId)
    {
        $user = $request->user();

        // 1. Fetch KegiatanStatistik details
        $kegiatanStatistik = KegiatanStatistik::where('id', $activityId)
                                            ->whereHas('members', function ($query) use ($user) {
                                                $query->where('user_id', $user->id);
                                            })
                                            ->firstOrFail();

        // Ensure the user has PPL or PML role for this activity
        if (!$user->hasAnyRole(['PPL', 'PML'])) {
            abort(403, 'Anda tidak memiliki akses ke kegiatan ini.');
        }

        // 2. Fetch Assignments for the user within this activity
        // If user is PPL, fetch their assignments. If PML, fetch assignments of PPLs they supervise.
        $assignments = collect([]);
        $pmlIdForPPL = null; // Initialize pmlIdForPPL

        if ($user->hasRole('PPL')) {
            $assignments = Assignment::with('response') // Eager load relasi response
                                    ->where('kegiatan_statistik_id', $kegiatanStatistik->id)
                                    ->where('ppl_id', $user->id)
                                    ->get();
            // Get the PML ID from one of the PPL's assignments
            if ($assignments->isNotEmpty()) {
                $pmlIdForPPL = $assignments->first()->pml_id;
            }
        } elseif ($user->hasRole('PML')) {
            $assignments = Assignment::with('response') // Eager load relasi response
                                    ->where('kegiatan_statistik_id', $kegiatanStatistik->id)
                                    ->where('pml_id', $user->id)
                                    ->get();
        }

        // Tambahkan properti status ke setiap assignment
        $assignments->each(function ($assignment) {
            $assignment->status = $assignment->response ? $assignment->response->status : \App\Constants::STATUS_ASSIGNED;
        });

        // 3. Fetch AssignmentResponses for the assignments
        $assignmentIds = $assignments->pluck('id');
        $assignmentResponses = \App\Models\AssignmentResponse::whereIn('assignment_id', $assignmentIds)->get();
        Log::info('getInitialData: Fetched assignmentResponses:', $assignmentResponses->toArray());

        // 4. Get Form Schema
        // Force decode, as the model cast seems to be behaving unexpectedly.
                // 4. Get Form Schema directly from DB to ensure correct JSON decoding
        $schemaString = DB::table('kegiatan_statistiks')->where('id', $activityId)->value('form_schema');
        $formSchema = json_decode($schemaString, true);

        // Add detailed logging for the schema
        $logData = [];
        if (is_array($formSchema)) {
            $logData['pages_count'] = isset($formSchema['pages']) ? count($formSchema['pages']) : 0;
            $logData['schema_keys'] = array_keys($formSchema);
        } else {
            $logData['schema_type'] = gettype($formSchema);
            $logData['schema_content_preview'] = substr(is_string($formSchema) ? $formSchema : '', 0, 100);
        }
        Log::info('ActivityController@getInitialData: Form schema for activity ' . $activityId, $logData);

        // 5. Fetch Master SLS data relevant to the assignments
        $slsCodes = $assignments->pluck('level_6_code_full')->filter()->unique();
        $masterSls = \App\Models\MasterSls::whereIn('sls_id', $slsCodes)->get();

        // 6. Fetch Master Data based on form_schema
        $masterData = collect([]);
        if (isset($formSchema['masters_used']) && is_array($formSchema['masters_used'])) {
            foreach ($formSchema['masters_used'] as $master) {
                if (isset($master['type']) && isset($master['version'])) {
                    $data = MasterData::where('type', $master['type'])
                                        ->where('version', $master['version'])
                                        ->first();
                    if ($data) {
                        $masterData->push([
                            'type' => $data->type,
                            'version' => $data->version,
                            'data' => $data->data,
                        ]);
                    }
                }
            }
        }

        // Return the data
        return response()->json([
            'data' => [
                'activity' => new KegiatanStatistikResource($kegiatanStatistik, ['pml_id_for_ppl' => $pmlIdForPPL]), // Pass pmlIdForPPL
                'assignments' => $assignments, // assignments sekarang sudah punya status
                'assignmentResponses' => $assignmentResponses,
                'master_sls' => $masterSls, 
                'form_schema' => $formSchema,
                'master_data' => $masterData,
            ]
        ]);
    }

    public function getUpdates(Request $request, $activityId)
    {
        // Placeholder untuk logika sinkronisasi delta di masa depan.
        // Saat ini hanya mengembalikan respons kosong agar tidak terjadi error 404.
        return response()->json([
            'data' => [
                'assignments' => [],
                'assignmentResponses' => [],
            ]
        ]);
    }

    public function submitAssignments(Request $request, $activityId)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            '*.assignment_id' => 'required|string|exists:assignments,id',
            '*.status' => 'required|string',
            '*.responses' => 'required|array',
            '*.version' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $validatedData = $validator->validated();

        DB::beginTransaction();
        try {
            foreach ($validatedData as $responseData) {
                $assignmentResponse = AssignmentResponse::where('assignment_id', $responseData['assignment_id'])->firstOrFail();

                // Authorization check: Ensure the user is the assigned PPL for this assignment
                if ($assignmentResponse->assignment->ppl_id !== $user->id) {
                    DB::rollBack();
                    return response()->json(['message' => 'Unauthorized to submit this assignment.'], 403);
                }

                // Optimistic locking check
                if ($assignmentResponse->version != $responseData['version']) {
                    DB::rollBack();
                    return response()->json(['message' => 'Conflict: Data has been updated since last sync.'], 409);
                }

                $assignmentResponse->status = $responseData['status'];
                $assignmentResponse->responses = $responseData['responses'];
                Log::info('submitAssignments: Responses data being saved:', $responseData['responses']);
                $assignmentResponse->version += 1;
                $assignmentResponse->submitted_by_ppl_at = now();
                $assignmentResponse->save();
            }

            DB::commit();

            return response()->json(['success' => true, 'message' => 'Assignments submitted successfully.']);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error submitting assignments: ' . $e->getMessage());
            return response()->json(['message' => 'An error occurred during submission.'], 500);
        }
    }

    public function getAllowedActions(Request $request, $assignmentId)
    {
        $user = $request->user();
        Log::info('getAllowedActions: User ID: ' . $user->id . ', Roles: ' . implode(', ', $user->getRoleNames()->toArray()));

        $assignment = Assignment::with('response', 'kegiatanStatistik.members')
                                ->where('id', $assignmentId)
                                ->firstOrFail();

        Log::info('getAllowedActions: Assignment ID: ' . $assignment->id);
        Log::info('getAllowedActions: Assignment Status: ' . ($assignment->response ? $assignment->response->status : 'No Response'));
        Log::info('getAllowedActions: KegiatanStatistik ID: ' . ($assignment->kegiatanStatistik ? $assignment->kegiatanStatistik->id : 'NULL'));
        Log::info('getAllowedActions: KegiatanStatistik Members Count: ' . ($assignment->kegiatanStatistik && $assignment->kegiatanStatistik->members ? $assignment->kegiatanStatistik->members->count() : 'NULL'));
        Log::info('getAllowedActions: User is PML: ' . ($user->hasRole('PML') ? 'true' : 'false'));
        Log::info('getAllowedActions: User is member of activity: ' . ($assignment->kegiatanStatistik && $assignment->kegiatanStatistik->members->contains('id', $user->id) ? 'true' : 'false'));

        // Explicit authorization check
        if (!$user->hasRole('PML') || !$assignment->kegiatanStatistik->members->contains('id', $user->id)) {
            abort(403, 'Anda tidak memiliki izin untuk melihat aksi yang diizinkan.');
        }

        $allowedActions = [];

        // Check assignment response status
        if ($assignment->response) {
            if ($assignment->response->status === 'Submitted by PPL') {
                $allowedActions[] = 'APPROVE';
                $allowedActions[] = 'REJECT';
            } elseif ($assignment->response->status === 'Approved by PML') {
                $allowedActions[] = 'REVERT_APPROVAL';
            }
        }

        return response()->json($allowedActions);
    }

    public function createAssignment(Request $request, $activityId)
    {
        Log::info('createAssignment: Method started.');
        $user = $request->user();

        // 1. Validate incoming data
        $validator = Validator::make($request->all(), [
            'assignment.id' => 'required|string|uuid',
            'assignment.kegiatan_statistik_id' => 'required|string|uuid|exists:kegiatan_statistiks,id',
            'assignment.satker_id' => 'required|string|uuid|exists:satkers,id',
            'assignment.ppl_id' => 'required|string|uuid|exists:users,id',
            'assignment.pml_id' => 'nullable|string|uuid|exists:users,id',
            'assignment.assignment_label' => 'required|string|max:255',
            'assignment.level_1_code' => 'nullable|string',
            'assignment.level_1_label' => 'nullable|string',
            'assignment.level_2_code' => 'nullable|string',
            'assignment.level_2_label' => 'nullable|string',
            'assignment.level_3_code' => 'nullable|string',
            'assignment.level_3_label' => 'nullable|string',
            'assignment.level_4_code' => 'nullable|string',
            'assignment.level_4_label' => 'nullable|string',
            'assignment.level_5_code' => 'nullable|string',
            'assignment.level_5_label' => 'nullable|string',
            'assignment.level_6_code' => 'nullable|string',
            'assignment.level_6_label' => 'nullable|string',
            'assignment.level_4_code_full' => 'required|string',
            'assignment.level_6_code_full' => 'nullable|string',
            'assignment.prefilled_data' => 'nullable|array',
            'assignment.status' => 'required|string|in:Assigned',

            'assignment_response.assignment_id' => 'required|string|uuid',
            'assignment_response.user_id' => 'required|string|uuid',
            'assignment_response.status' => 'required|string|in:Assigned',
            'assignment_response.version' => 'required|integer',
            'assignment_response.form_version_used' => 'required|integer',
            'assignment_response.responses' => 'nullable|array',

            'photo_id' => 'nullable|string|uuid|exists:assignment_attachments,id', // Photo ID from pre-uploaded photo
        ]);

        if ($validator->fails()) {
            Log::error('Create Assignment Validation Failed:', $validator->errors()->toArray());
            return response()->json($validator->errors(), 422);
        }
        Log::info('createAssignment: Validation passed.');

        $validated = $validator->validated();

        Log::info('createAssignment: Starting DB transaction.');
        DB::beginTransaction();
        try {
            Log::info('createAssignment: Transaction started.');
            $kegiatanStatistik = KegiatanStatistik::where('id', $activityId)->firstOrFail();

            // 2. Enforce allow_new_assignments_from_pwa check
            if (!$kegiatanStatistik->allow_new_assignments_from_pwa) {
                DB::rollBack();
                Log::warning('createAssignment: Activity does not allow new assignments from PWA.');
                return response()->json(['message' => 'This activity does not allow new assignments to be created from PWA.'], 403);
            }

            // Authorization: Ensure the user is the assigned PPL for this new assignment
            if ($validated['assignment']['ppl_id'] !== $user->id) {
                DB::rollBack();
                Log::warning('createAssignment: Unauthorized to create assignment for another PPL.');
                return response()->json(['message' => 'Unauthorized to create assignment for another PPL.'], 403);
            }

            // Create Assignment record
            Log::info('createAssignment: Creating Assignment record.');
            $assignment = new Assignment($validated['assignment']);
            $assignment->id = $validated['assignment']['id']; // Ensure UUID is used
            $assignment->prefilled_data = $validated['assignment']['prefilled_data'] ?? [];

            

            Log::info('createAssignment: Saving Assignment record.');
            $assignment->save();
            Log::info('createAssignment: Assignment record saved.');

            // Create AssignmentResponse record
            Log::info('createAssignment: Creating AssignmentResponse record.');
            $assignmentResponse = new AssignmentResponse($validated['assignment_response']);
            $assignmentResponse->assignment_id = $validated['assignment_response']['assignment_id']; // Ensure UUID is used
            $assignmentResponse->responses = $validated['assignment_response']['responses'] ?? [];
            $assignmentResponse->status = 'Submitted by PPL'; // Set status to Submitted by PPL on successful creation
            $assignmentResponse->submitted_by_ppl_at = now();
            Log::info('createAssignment: Saving AssignmentResponse record.');
            $assignmentResponse->save();
            Log::info('createAssignment: AssignmentResponse record saved.');

            // If photo_id is present, link the AssignmentAttachment
            if (!empty($validated['photo_id'])) {
                Log::info('createAssignment: Linking AssignmentAttachment.');
                $attachment = \App\Models\AssignmentAttachment::find($validated['photo_id']);
                if ($attachment) {
                    $attachment->assignment_id = $assignment->id;
                    $attachment->save();
                    Log::info('createAssignment: AssignmentAttachment linked and saved.');
                }
            }

            Log::info('createAssignment: Committing DB transaction.');
            DB::commit();
            Log::info('createAssignment: Transaction committed.');

            return response()->json(['message' => 'Assignment created successfully', 'assignment_id' => $assignment->id], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating new assignment: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to create assignment.'], 500);
        }
    }
}

