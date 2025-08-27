<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Resources\KegiatanStatistikResource;
use Carbon\Carbon;
use App\Models\KegiatanStatistik; // Import KegiatanStatistik
use App\Models\Assignment; // Import Assignment
use App\Models\MasterData; // Import MasterData
use Illuminate\Support\Facades\Log; // Import Log facade

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
        if ($user->hasRole('PPL')) {
            $assignments = Assignment::with('response') // Eager load relasi response
                                    ->where('kegiatan_statistik_id', $kegiatanStatistik->id)
                                    ->where('ppl_id', $user->id)
                                    ->get();
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
        // TIDAK PERLU LAGI, KARENA STATUS SUDAH DI-EMBED
        // $assignmentIds = $assignments->pluck('id');
        // $assignmentResponses = \App\Models\AssignmentResponse::whereIn('assignment_id', $assignmentIds)->get();

        // 4. Get Form Schema
        $formSchema = $kegiatanStatistik->form_schema;

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
                'activity' => new KegiatanStatistikResource($kegiatanStatistik), 
                'assignments' => $assignments, // assignments sekarang sudah punya status
                // 'assignmentResponses' => $assignmentResponses, // Tidak perlu dikirim lagi
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
}

