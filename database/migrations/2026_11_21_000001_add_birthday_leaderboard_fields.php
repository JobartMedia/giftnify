<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Birthday leaderboard. Only the day and month are stored (the year is not
 * needed to rank anyone), and the birthday is locked once set so nobody can
 * move it month to month to stay on top.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedTinyInteger('birth_month')->nullable();
            $table->unsignedTinyInteger('birth_day')->nullable();
            $table->timestamp('birthday_set_at')->nullable();
            $table->boolean('leaderboard_opt_in')->default(true);
            $table->string('city', 60)->nullable();
            $table->string('country', 2)->nullable();
            $table->index(['birth_month', 'birth_day']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['birth_month', 'birth_day']);
            $table->dropColumn(['birth_month', 'birth_day', 'birthday_set_at', 'leaderboard_opt_in', 'city', 'country']);
        });
    }
};
