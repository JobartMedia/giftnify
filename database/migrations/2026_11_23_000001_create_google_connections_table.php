<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A person's link to their Google account, for Contacts and Calendar. Tokens are encrypted. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('google_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('google_email')->nullable();
            $table->text('scopes')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('calendar_enabled')->default(false);
            $table->string('calendar_id')->nullable();
            $table->unsignedInteger('calendar_events')->default(0);
            $table->timestamp('calendar_synced_at')->nullable();
            $table->timestamp('contacts_imported_at')->nullable();
            $table->string('last_error', 300)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_connections');
    }
};
