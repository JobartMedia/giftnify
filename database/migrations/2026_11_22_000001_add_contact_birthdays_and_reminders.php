<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Birthdays at sign-up, contacts that recognise people already on Giftnify,
 * and the daily "birthday coming up" reminder emails.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_key', 15)->nullable()->index();
            // People who have saved my number or email can see my birthday (day and month).
            $table->boolean('birthday_visible')->default(true);
            // Email me before the birthdays of people I've saved.
            $table->boolean('birthday_reminders')->default(true);
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->string('phone_key', 15)->nullable()->index();
            $table->string('source', 20)->nullable(); // manual | phone | vcard
        });

        Schema::create('birthday_reminder_log', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('contact_id');
            $table->date('occurs_on');
            $table->unsignedTinyInteger('lead_days');
            $table->timestamp('sent_at');
            $table->unique(['contact_id', 'occurs_on', 'lead_days']);
        });

        // Match keys for numbers saved before this change.
        foreach (['users', 'contacts'] as $t) {
            \DB::table($t)->whereNotNull('phone')->orderBy('id')->each(function ($row) use ($t) {
                \DB::table($t)->where('id', $row->id)->update(['phone_key' => \App\Services\BirthdayBook::phoneKey($row->phone)]);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_reminder_log');
        Schema::table('contacts', fn (Blueprint $t) => $t->dropColumn(['phone_key', 'source']));
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['phone_key', 'birthday_visible', 'birthday_reminders']));
    }
};
