<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Tracks whether the gift link actually reached the recipient. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            // pending | sent | failed | manual (Link: the sender shares it)
            $table->string('delivery_status', 20)->default('pending')->after('delivery');
            $table->timestamp('delivered_at')->nullable()->after('delivery_status');
            $table->string('delivery_error')->nullable()->after('delivered_at');
        });
    }

    public function down(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            $table->dropColumn(['delivery_status', 'delivered_at', 'delivery_error']);
        });
    }
};
