<?php

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
        Schema::table('assignment_attachments', function (Blueprint $table) {
            // Drop the existing foreign key constraint first
            $table->dropForeign(['assignment_id']);
            // Change the column to nullable
            $table->uuid('assignment_id')->nullable()->change();
            // Re-add the foreign key constraint with nullable option
            $table->foreign('assignment_id')->references('id')->on('assignments')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assignment_attachments', function (Blueprint $table) {
            // Drop the foreign key constraint
            $table->dropForeign(['assignment_id']);
            // Change the column back to not nullable
            $table->uuid('assignment_id')->nullable(false)->change();
            // Re-add the foreign key constraint
            $table->foreign('assignment_id')->references('id')->on('assignments')->onDelete('cascade');
        });
    }
};