<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mystery reveal: the pre-reveal hint, the moment of reveal, and the
 * recipient's first reaction (reply) captured right after it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            $table->string('relationship', 40)->nullable()->after('occasion');
            $table->string('sender_hint', 180)->nullable()->after('relationship');
            $table->timestamp('revealed_at')->nullable()->after('expires_at');
            $table->text('reply_text')->nullable()->after('revealed_at');
            $table->string('reply_media_path')->nullable()->after('reply_text');
            $table->timestamp('replied_at')->nullable()->after('reply_media_path');
        });
    }

    public function down(): void
    {
        Schema::table('gifts', function (Blueprint $table) {
            $table->dropColumn(['relationship', 'sender_hint', 'revealed_at', 'reply_text', 'reply_media_path', 'replied_at']);
        });
    }
};
