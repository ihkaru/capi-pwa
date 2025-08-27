<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class KegiatanSatker extends Pivot
{
    use HasFactory;

    protected $table = 'kegiatan_satkers';

    public function kegiatanStatistik(): BelongsTo
    {
        return $this->belongsTo(KegiatanStatistik::class);
    }

    public function satker(): BelongsTo
    {
        return $this->belongsTo(Satker::class);
    }
}
