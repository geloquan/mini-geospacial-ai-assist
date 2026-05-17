<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('locations', 'timezone')) {
            Schema::table('locations', function (Blueprint $table): void {
                $table->string('timezone')->default(config('app.timezone'))->after('image_paths');
            });
        }

        DB::table('locations')
            ->whereNull('timezone')
            ->update(['timezone' => config('app.timezone')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('locations', function (Blueprint $table): void {
            if (Schema::hasColumn('locations', 'timezone')) {
                $table->dropColumn('timezone');
            }
        });
    }
};
