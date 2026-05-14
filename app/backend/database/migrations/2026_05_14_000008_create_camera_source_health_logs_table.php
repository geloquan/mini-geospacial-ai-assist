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
        Schema::create('camera_source_health_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('camera_source_id')->constrained('camera_sources')->cascadeOnDelete();
            $table->string('status');
            $table->unsignedInteger('delay')->nullable();
            $table->timestamp('logged_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('camera_source_health_logs');
    }
};
