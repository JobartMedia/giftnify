<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_occasions', function (Blueprint $table) {
            $table->string('id', 64)->primary();
            $table->string('label');
            $table->string('icon', 64);
            $table->integer('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('cms_catalog_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('category', 64);
            $table->string('icon', 64);
            $table->decimal('price_usd', 10, 2);
            $table->text('description')->nullable();
            $table->boolean('available')->default(true);
            $table->timestamps();
        });

        Schema::create('cms_currencies', function (Blueprint $table) {
            $table->string('code', 10)->primary();
            $table->string('symbol', 10);
            $table->string('name', 64);
            $table->decimal('per_usd', 16, 6)->default(1.0);
            $table->integer('decimals')->default(2);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('cms_settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->json('value');
            $table->timestamps();
        });

        Schema::create('contacts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('occasion')->nullable();
            $table->date('occasion_date')->nullable();
            $table->timestamps();
        });

        Schema::create('guest_support_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email');
            $table->string('topic');
            $table->text('body');
            $table->string('gift_token')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_support_requests');
        Schema::dropIfExists('contacts');
        Schema::dropIfExists('cms_settings');
        Schema::dropIfExists('cms_currencies');
        Schema::dropIfExists('cms_catalog_items');
        Schema::dropIfExists('cms_occasions');
    }
};
