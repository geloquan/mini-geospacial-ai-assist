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
        if (!Schema::hasColumn('raw_data_collection_settings', 'session_group_id')) {
            return;
        }

        Schema::table('raw_data_collection_settings', function (Blueprint $table): void {
            $table->dropColumn('session_group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('raw_data_collection_settings', 'session_group_id')) {
            return;
        }

        Schema::table('raw_data_collection_settings', function (Blueprint $table): void {
            $table->string('session_group_id')->default('');
        });
    }
};
