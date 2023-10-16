// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

function handler(event) {
  var request = event.request;
  if (request.method == 'GET' && request.uri.indexOf('.') == -1) {
    request.uri = "/index.html";
  }
  return request;
}