@extends('emails.layout')
@section('body')
  <h1 style="font-size:26px;line-height:1.15;margin:0 0 12px">{{ $name }}, you got a mystery gift.</h1>
  <p style="font-size:15px;line-height:1.6;color:#6E5A68;margin:0 0 16px">Someone sent you a {{ strtolower($occasion) }} gift with a personal message. Play it to find out who it's from and what's inside.</p>
  @if($hint)
    <p style="font-size:15px;line-height:1.5;background:#FFF0F7;border-radius:16px;padding:14px 16px;margin:0 0 22px"><strong style="color:#B4005E">A hint:</strong> {{ $hint }}</p>
  @endif
  <a href="{{ $link }}" style="display:inline-block;background:#E5007D;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px">Open my gift</a>
  <p style="font-size:12px;color:#6E5A68;margin:22px 0 0">Or paste this link into your browser: {{ $link }}</p>
@endsection
