<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * - Guess-who game: up to 3 hints, 3 tries, skippable.
 * - Scheduled gifts ("Birthday Bomb"): locked until unlock_at, teaser sent first.
 * - Value teaser: keep the amount a total mystery, or hint how big it is.
 * - Anonymous senders.
 * - Creator gift links (giftnify.app/@name): public page where fans send gifts.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            $table->string('reveal_mode', 12)->default('classic')->after('sender_hint'); // classic | guess | anonymous
            $table->json('guess_hints')->nullable()->after('reveal_mode');
            $table->text('guess_answers')->nullable()->after('guess_hints'); // encrypted: other names the sender goes by
            $table->unsignedTinyInteger('guess_attempts')->default(0)->after('guess_answers');
            $table->string('guess_result', 10)->nullable()->after('guess_attempts'); // correct | out | skipped
            $table->string('value_teaser', 10)->default('mystery')->after('guess_result'); // mystery | figures
            $table->timestamp('unlock_at')->nullable()->after('value_teaser');
            $table->timestamp('teaser_sent_at')->nullable()->after('unlock_at');
            $table->string('wall_note', 140)->nullable()->after('teaser_sent_at');
            $table->boolean('on_wall')->default(false)->after('wall_note');
            $table->boolean('wall_hidden')->default(false)->after('on_wall');
            $table->index(['recipient_user_id', 'on_wall']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 30)->nullable()->unique()->after('name');
            $table->string('bio', 160)->nullable()->after('username');
            $table->boolean('creator_enabled')->default(false)->after('bio');
            $table->string('creator_currency', 3)->nullable()->after('creator_enabled');
            $table->json('creator_amounts')->nullable()->after('creator_currency');
            $table->boolean('creator_wall')->default(true)->after('creator_amounts');
        });
    }

    public function down(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            $table->dropIndex(['recipient_user_id', 'on_wall']);
            $table->dropColumn(['reveal_mode', 'guess_hints', 'guess_answers', 'guess_attempts', 'guess_result', 'value_teaser',
                'unlock_at', 'teaser_sent_at', 'wall_note', 'on_wall', 'wall_hidden']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'bio', 'creator_enabled', 'creator_currency', 'creator_amounts', 'creator_wall']);
        });
    }
};
