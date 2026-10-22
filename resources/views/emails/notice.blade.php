@extends('emails.layout')
@section('body')
  <p style="font-size:17px;line-height:1.5;margin:0 0 22px">{{ $line }}</p>
  <a href="{{ $link }}" style="display:inline-block;background:#E5007D;color:#ffffff;text-decoration:none;font-weight:800;padding:14px 26px;border-radius:999px">{{ $cta }}</a>
@endsection
