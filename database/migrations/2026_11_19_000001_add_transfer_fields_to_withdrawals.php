<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Automatic payouts: which channel paid a withdrawal and the provider's transfer reference. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->string('payout_channel', 20)->nullable()->after('status'); // manual | paystack
            $table->string('transfer_reference', 80)->nullable()->unique()->after('payout_channel');
            $table->string('transfer_code', 80)->nullable()->after('transfer_reference');
        });
    }

    public function down(): void
    {
        Schema::table('withdrawals', function (Blueprint $table) {
            $table->dropUnique(['transfer_reference']);
            $table->dropColumn(['payout_channel', 'transfer_reference', 'transfer_code']);
        });
    }
};
