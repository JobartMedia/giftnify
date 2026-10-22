<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Giftnify wallet: one balance per user per currency, an append-only ledger,
 * and withdrawal requests that staff pay out.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('currency', 10);
            $table->decimal('balance', 14, 2)->default(0);
            $table->timestamps();
            $table->unique(['user_id', 'currency']);
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('type', ['credit', 'debit']);
            // gift_received | withdrawal | withdrawal_reversal | adjustment
            $table->string('source', 40);
            // Gift token or withdrawal id. Unique with source so the same event can never post twice.
            $table->string('reference', 80);
            $table->decimal('amount', 14, 2);
            $table->decimal('balance_after', 14, 2);
            $table->string('description')->nullable();
            $table->timestamps();
            $table->unique(['source', 'reference']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('withdrawals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('wallet_id')->constrained('wallets')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->string('currency', 10);
            $table->string('method', 40);
            $table->text('details'); // encrypted JSON (bank / phone / meter)
            $table->enum('status', ['pending', 'processing', 'paid', 'failed', 'cancelled'])->default('pending');
            $table->string('failure_reason')->nullable();
            $table->foreignUuid('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });

        Schema::table('gifts', function (Blueprint $table) {
            $table->foreignUuid('recipient_user_id')->nullable()->after('sender_id')->constrained('users')->nullOnDelete();
            $table->timestamp('claimed_at')->nullable()->after('redeemed_at');
        });
    }

    public function down(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('recipient_user_id');
            $table->dropColumn('claimed_at');
        });
        Schema::dropIfExists('withdrawals');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
    }
};
