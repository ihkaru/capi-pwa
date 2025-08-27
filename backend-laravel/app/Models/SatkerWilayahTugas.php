<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SatkerWilayahTugas extends Model
{
    use HasFactory;

    protected $fillable = [
        'satker_id',
        'wilayah_level',
        'wilayah_code_prefix',
    ];

    public function satker(): BelongsTo
    {
        return $this->belongsTo(Satker::class);
    }
}
