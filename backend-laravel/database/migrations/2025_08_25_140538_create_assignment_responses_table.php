<?php

use App\Constants;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('assignment_responses', function (Blueprint $table) {
            $table->foreignUuid('assignment_id')->primary()->constrained('assignments')->cascadeOnDelete();
            $table->enum('status', Constants::getResponseStatuses());
            $table->integer('version')->default(1);
            $table->integer('form_version_used');
            $table->json('responses')->nullable();
            $table->timestamp('submitted_by_ppl_at')->nullable();
            $table->timestamp('reviewed_by_pml_at')->nullable();
            $table->timestamp('reviewed_by_admin_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignment_responses');
    }
};