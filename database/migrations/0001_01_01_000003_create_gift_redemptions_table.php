<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gift_redemptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('gift_token', 64)->unique()->index();
            $table->string('method', 64);
            $table->json('details')->nullable();
            $table->enum('payout_status', ['pending', 'processing', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->foreign('gift_token')->references('token')->on('gifts')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gift_redemptions');
    }
};
