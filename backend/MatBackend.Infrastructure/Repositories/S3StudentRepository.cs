using System.Net;
using System.Text.Json;
using Amazon.S3;
using Amazon.S3.Model;
using MatBackend.Core.Interfaces;
using MatBackend.Core.Models;
using Microsoft.Extensions.Logging;

namespace MatBackend.Infrastructure.Repositories;

/// <summary>
/// Stores students as JSON objects in an S3-compatible bucket (Scaleway Object Storage).
/// Object key layout: users/{id}/profile.json — mirrors the file-based repository.
/// </summary>
public class S3StudentRepository : IStudentRepository
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucketName;
    private readonly ILogger<S3StudentRepository> _logger;

    private static readonly JsonSerializerOptions ReadOptions = new() { PropertyNameCaseInsensitive = true };
    private static readonly JsonSerializerOptions WriteOptions = new() { WriteIndented = true };

    public S3StudentRepository(IAmazonS3 s3, string bucketName, ILogger<S3StudentRepository> logger)
    {
        _s3 = s3;
        _bucketName = bucketName;
        _logger = logger;
    }

    public async Task<Student?> GetStudentByIdAsync(string id)
    {
        var key = $"users/{id}/profile.json";
        return await ReadStudentAsync(key);
    }

    public async Task<Student?> GetStudentByNameAsync(string name)
    {
        return await FindStudentAsync(s =>
            string.Equals(s.Name, name, StringComparison.OrdinalIgnoreCase));
    }

    public async Task UpdateStudentAsync(Student student)
    {
        var key = $"users/{student.Id}/profile.json";
        var json = JsonSerializer.Serialize(student, WriteOptions);

        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            ContentBody = json,
            ContentType = "application/json"
        };

        await _s3.PutObjectAsync(request);
        _logger.LogDebug("Saved student {Id} to s3://{Bucket}/{Key}", student.Id, _bucketName, key);
    }

    public async Task<bool> DeleteStudentAsync(string id)
    {
        var prefix = $"users/{id}/";
        var listRequest = new ListObjectsV2Request
        {
            BucketName = _bucketName,
            Prefix = prefix
        };

        var anyDeleted = false;
        ListObjectsV2Response listResponse;
        do
        {
            listResponse = await _s3.ListObjectsV2Async(listRequest);
            if (listResponse.S3Objects.Count == 0) break;

            var deleteRequest = new DeleteObjectsRequest
            {
                BucketName = _bucketName,
                Objects = listResponse.S3Objects.Select(o => new KeyVersion { Key = o.Key }).ToList()
            };
            await _s3.DeleteObjectsAsync(deleteRequest);
            anyDeleted = true;

            listRequest.ContinuationToken = listResponse.NextContinuationToken;
        } while (listResponse.IsTruncated == true);

        _logger.LogInformation("Deleted all S3 objects for student {Id}", id);
        return anyDeleted;
    }

    private async Task<Student?> ReadStudentAsync(string key)
    {
        try
        {
            var response = await _s3.GetObjectAsync(_bucketName, key);
            using var reader = new StreamReader(response.ResponseStream);
            var json = await reader.ReadToEndAsync();
            return JsonSerializer.Deserialize<Student>(json, ReadOptions);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    private async Task<Student?> FindStudentAsync(Func<Student, bool> predicate)
    {
        var request = new ListObjectsV2Request
        {
            BucketName = _bucketName,
            Prefix = "users/",
            Delimiter = "/"
        };

        ListObjectsV2Response response;
        do
        {
            response = await _s3.ListObjectsV2Async(request);

            foreach (var prefix in response.CommonPrefixes)
            {
                var key = $"{prefix}profile.json";
                var student = await ReadStudentAsync(key);
                if (student != null && predicate(student))
                    return student;
            }

            request.ContinuationToken = response.NextContinuationToken;
        } while (response.IsTruncated == true);

        return null;
    }
}
