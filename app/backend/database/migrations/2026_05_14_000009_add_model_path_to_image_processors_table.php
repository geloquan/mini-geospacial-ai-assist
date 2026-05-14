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
        Schema::table('image_processors', function (Blueprint $table): void {
            $table->string('model_path', 2048)->nullable()->after('model_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('image_processors', function (Blueprint $table): void {
            $table->dropColumn('model_path');
        });
    }
};
