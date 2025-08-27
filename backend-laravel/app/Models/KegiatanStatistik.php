<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class KegiatanStatistik extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name',
        'year',
        'start_date',
        'end_date',
        'extended_end_date',
        'form_schema',
        'form_version',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'extended_end_date' => 'date',
        'form_schema' => 'array',
    ];

    public function satkers(): BelongsToMany
    {
        return $this->belongsToMany(Satker::class, 'kegiatan_satkers', 'kegiatan_statistik_id', 'satker_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'kegiatan_members', 'kegiatan_statistik_id', 'user_id');
    }
}
