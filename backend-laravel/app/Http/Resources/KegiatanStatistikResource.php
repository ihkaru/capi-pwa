<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Carbon\Carbon;

class KegiatanStatistikResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $userRole = null;

        // Determine user's role for this specific activity
        // This assumes roles are assigned directly to the user and we need to find the relevant one.
        // If roles are context-specific (e.g., via pivot table for this activity),
        // this logic needs to be more sophisticated.
        // For simplicity, we'll check if the user has PPL or PML role.
        if ($user->hasRole('PPL')) {
            $userRole = 'PPL';
        } elseif ($user->hasRole('PML')) {
            $userRole = 'PML';
        }

        // Determine activity status
        $status = 'Tidak Diketahui';
        $today = Carbon::now();

        if ($this->extended_end_date && $today->greaterThan($this->extended_end_date)) {
            $status = 'Selesai';
        } elseif ($today->between($this->start_date, $this->end_date)) {
            $status = 'Berlangsung';
        } elseif ($today->lessThan($this->start_date)) {
            $status = 'Akan Datang';
        } elseif ($today->greaterThan($this->end_date)) {
            $status = 'Selesai'; // Default to Selesai if past end_date but no extended_end_date
        }


        return [
            'id' => $this->id,
            'name' => $this->name,
            'year' => $this->year,
            'user_role' => $userRole, // This needs to be accurate for the specific activity
            'status' => $status,
        ];
    }
}
