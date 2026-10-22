<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('reference', 120)->unique()->index();
            $table->string('gift_token', 64)->index();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('provider', 32)->default('demo'); // demo, paystack, flutterwave, stripe
            $table->string('provider_ref')->nullable();
            $table->decimal('amount', 12, 2);
            $table->decimal('fee', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->string('promo_code')->nullable();
            $table->string('currency', 10)->default('USD');
            $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();

            $table->foreign('gift_token')->references('token')->on('gifts')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
