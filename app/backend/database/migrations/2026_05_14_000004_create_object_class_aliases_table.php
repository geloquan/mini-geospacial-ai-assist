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
        Schema::create('object_class_aliases', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('object_class_id')->constrained('object_classes')->cascadeOnDelete();
            $table->string('alias');
            $table->timestamps();

            $table->unique(['object_class_id', 'alias']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('object_class_aliases');
    }
};
