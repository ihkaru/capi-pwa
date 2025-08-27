<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssignmentResponse extends Model
{
    use HasFactory;

    protected $primaryKey = 'assignment_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'assignment_id',
        'status',
        'version',
        'form_version_used',
        'responses',
        'submitted_by_ppl_at',
        'reviewed_by_pml_at',
        'reviewed_by_admin_at',
    ];

    protected $casts = [
        'responses' => 'array',
        'submitted_by_ppl_at' => 'datetime',
        'reviewed_by_pml_at' => 'datetime',
        'reviewed_by_admin_at' => 'datetime',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class, 'assignment_id');
    }
}