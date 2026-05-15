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
        Schema::create('raw_data_collection_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('camera_source_id')->constrained('camera_sources')->cascadeOnDelete();
            $table->string('storage_destination');
            $table->unsignedBigInteger('max_storage_size_mb');
            $table->unsignedInteger('max_image_count');
            $table->string('lifecycle_strategy');
            $table->unsignedInteger('frame_sampling_interval_value');
            $table->string('frame_sampling_interval_unit');
            $table->string('session_group_id');
            $table->text('collection_context_notes')->nullable();
            $table->string('collection_type');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_data_collection_settings');
    }
};
