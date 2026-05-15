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
        Schema::table('locations', function (Blueprint $table): void {
            if (!Schema::hasColumn('locations', 'image_paths')) {
                $table->json('image_paths')->nullable()->after('descriptive_location');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table): void {
            if (Schema::hasColumn('locations', 'image_paths')) {
                $table->dropColumn('image_paths');
            }
        });
    }
};
