<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne; // IMPORT HASONE

class Assignment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'satker_id',
        'kegiatan_statistik_id',
        'ppl_id',
        'pml_id',
        'level_1_code',
        'level_2_code',
        'level_3_code',
        'level_4_code',
        'level_5_code',
        'level_6_code',
        'level_1_label',
        'level_2_label',
        'level_3_label',
        'level_4_label',
        'level_5_label',
        'level_6_label',
        'assignment_label',
        'prefilled_data',
        'level_4_code_full',
        'level_6_code_full',
    ];

    protected $casts = [
        'prefilled_data' => 'array',
    ];

    // RELASI BARU: Setiap assignment memiliki satu response
    public function response(): HasOne
    {
        return $this->hasOne(AssignmentResponse::class, 'assignment_id', 'id');
    }

    public function satker(): BelongsTo
    {
        return $this->belongsTo(Satker::class);
    }
    public function kegiatanStatistik(): BelongsTo
    {
        return $this->belongsTo(KegiatanStatistik::class);
    }

    public function ppl(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ppl_id');
    }

    public function pml(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pml_id');
    }
}
