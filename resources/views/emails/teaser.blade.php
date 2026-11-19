@extends('emails.layout')
@section('body')
  <h1 style="font-size:26px;line-height:1.15;margin:0 0 12px">Something is coming, {{ $name }}… 🔒</h1>
  <p style="font-size:15px;line-height:1.6;color:#6E5A68;margin:0 0 16px">Someone scheduled a {{ strtolower($occasion) }} mystery gift for you. It unlocks <strong style="color:#251522">{{ $when }}</strong>. Not a minute before.</p>
  @if(!empty($teaser))
    <p style="font-size:15px;font-weight:800;color:#B4005E;margin:0 0 22px">{{ $teaser }}</p>
  @endif
  <a href="{{ $link }}" style="display:inline-block;background:#E5007D;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px">Watch the countdown</a>
  <p style="font-size:12px;color:#6E5A68;margin:22px 0 0">We'll message you again the moment it unlocks.</p>
@endsection
