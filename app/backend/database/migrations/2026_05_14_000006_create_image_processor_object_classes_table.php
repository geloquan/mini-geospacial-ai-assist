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
        Schema::create('image_processor_object_classes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('image_processor_id')->constrained('image_processors')->cascadeOnDelete();
            $table->foreignId('object_class_id')->constrained('object_classes')->cascadeOnDelete();
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();

            $table->unique(['image_processor_id', 'object_class_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('image_processor_object_classes');
    }
};
