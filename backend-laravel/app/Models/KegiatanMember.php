<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

class KegiatanMember extends Pivot
{
    use HasFactory;

    protected $table = 'kegiatan_members';

    public function kegiatanStatistik(): BelongsTo
    {
        return $this->belongsTo(KegiatanStatistik::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
