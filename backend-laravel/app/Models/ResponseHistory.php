<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResponseHistory extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'assignment_response_id',
        'user_id',
        'from_status',
        'to_status',
        'notes',
    ];

    public function assignmentResponse(): BelongsTo
    {
        return $this->belongsTo(AssignmentResponse::class, 'assignment_response_id', 'assignment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}