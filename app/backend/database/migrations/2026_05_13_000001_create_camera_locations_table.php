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
        Schema::create('camera_locations', function (Blueprint $table): void {
            $table->id();
            $table->string('location_name');
            $table->text('descriptive_location');
            $table->string('camera_identifier')->nullable();
            $table->string('live_feed_url')->nullable();
            $table->json('camera_specification')->nullable();
            $table->json('yolo_model_metadata')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('camera_locations');
    }
};
