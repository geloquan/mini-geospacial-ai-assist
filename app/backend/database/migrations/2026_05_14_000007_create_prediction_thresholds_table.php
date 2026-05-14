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
        Schema::create('prediction_thresholds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('camera_source_id')->constrained('camera_sources')->cascadeOnDelete();
            $table->foreignId('image_processor_id')->constrained('image_processors')->cascadeOnDelete();
            $table->foreignId('object_class_id')->nullable()->constrained('object_classes')->nullOnDelete();
            $table->decimal('confidence_threshold', 4, 3)->default(0.500);
            $table->decimal('iou_threshold', 4, 3)->default(0.500);
            $table->timestamps();

            $table->unique([
                'camera_source_id',
                'image_processor_id',
                'object_class_id',
            ], 'prediction_threshold_unique_scope');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('prediction_thresholds');
    }
};
