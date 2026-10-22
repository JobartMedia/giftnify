<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('token', 64)->unique()->index();
            $table->foreignUuid('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sender_name')->default('A friend');
            $table->string('recipient_name');
            $table->string('recipient_contact')->nullable();
            $table->string('occasion')->default('Birthday');
            $table->enum('message_type', ['text', 'audio', 'video'])->default('text');
            $table->text('message_text')->nullable();
            $table->string('media_path')->nullable();
            $table->string('currency', 10)->default('USD');
            $table->decimal('amount', 12, 2)->default(0);
            $table->string('item')->nullable();
            $table->enum('delivery', ['WhatsApp', 'SMS', 'Email', 'Link'])->default('WhatsApp');
            $table->enum('status', [
                'Awaiting Payment',
                'Preparing',
                'Sent',
                'Opened',
                'Message Viewed',
                'Unlocked',
                'Redeemed',
                'Refunded',
                'Cancelled'
            ])->default('Awaiting Payment');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('redeemed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gifts');
    }
};
